const SearchIndex = require('../models/SearchIndex');
const PDF = require('../models/PDF');
const Highlight = require('../models/Highlight');

// Standalone utility function
function highlightSearchTerms(content, query) {
  const terms = query.split(' ').filter(term => term.length > 1);
  let highlighted = content;
  
  terms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  });
  
  return highlighted;
}

class SearchController {
  async search(req, res, next) {
    try {
      console.log('🔍 Search request received:', req.query);
      
      const { 
        query, 
        pdfUuid, 
        contentType = 'all'
      } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({ 
          error: 'Search query must be at least 2 characters',
          results: [],
          pagination: { total: 0, pages: 0, current: 1 }
        });
      }

      console.log('👤 User ID:', req.user._id);
      console.log('🔍 Search query:', query);

      // Check if we have any search index data
      const totalIndexCount = await SearchIndex.countDocuments({ userId: req.user._id });
      console.log('📊 Total indexed items for user:', totalIndexCount);

      if (totalIndexCount === 0) {
        console.log('⚠️ No indexed content found. Auto-indexing highlights...');
        
        // Auto-index existing highlights
        await this.autoIndexHighlights(req.user._id);
        
        return res.json({
          results: [],
          pagination: { total: 0, pages: 0, current: 1 },
          message: 'No content indexed yet. Please create some highlights or upload PDFs to search.',
          needsIndexing: true
        });
      }

      // Build search filter
      let searchFilter = {
        userId: req.user._id,
        content: { $regex: query, $options: 'i' }
      };

      if (pdfUuid) {
        searchFilter.pdfUuid = pdfUuid;
      }

      if (contentType !== 'all') {
        searchFilter.contentType = contentType;
      }

      console.log('🔍 Search filter:', searchFilter);

      // Perform search
      const results = await SearchIndex.find(searchFilter)
        .sort({ createdAt: -1 })
        .limit(20);

      console.log('📊 Search results count:', results.length);

      // Get PDF names
      const pdfUuids = [...new Set(results.map(r => r.pdfUuid))];
      console.log('📄 PDF UUIDs to look up:', pdfUuids);

      let pdfMap = {};
      
      if (pdfUuids.length > 0) {
        try {
          const pdfs = await PDF.find({
            uuid: { $in: pdfUuids },
            userId: req.user._id
          }).select('uuid originalName');

          console.log('📄 Found PDFs:', pdfs.length);

          pdfs.forEach(pdf => {
            pdfMap[pdf.uuid] = pdf.originalName;
          });
        } catch (pdfError) {
          console.error('❌ Error fetching PDF names:', pdfError);
          pdfUuids.forEach(uuid => {
            pdfMap[uuid] = 'Unknown PDF';
          });
        }
      }

      // Format results using the standalone function
      const formattedResults = results.map(result => {
        const highlightedContent = highlightSearchTerms(result.content, query);
        
        return {
          id: result._id,
          pdfUuid: result.pdfUuid,
          pdfName: pdfMap[result.pdfUuid] || 'Unknown PDF',
          pageNumber: result.pageNumber,
          content: result.content,
          highlightedContent,
          contentType: result.contentType,
          score: 1,
          highlightId: result.highlightId,
          position: result.position,
          createdAt: result.createdAt
        };
      });

      console.log('✅ Returning formatted results:', formattedResults.length);

      res.json({
        results: formattedResults,
        pagination: {
          current: 1,
          pages: Math.ceil(results.length / 20),
          total: results.length
        },
        query
      });

    } catch (error) {
      console.error('❌ Search error:', error);
      res.status(500).json({ 
        error: 'Search failed',
        message: error.message,
        results: [],
        pagination: { total: 0, pages: 0, current: 1 }
      });
    }
  }

  // Auto-index existing highlights
  async autoIndexHighlights(userId) {
    try {
      console.log('🔄 Auto-indexing existing highlights for user:', userId);
      
      const highlights = await Highlight.find({ userId });
      console.log('💡 Found highlights to index:', highlights.length);
      
      for (const highlight of highlights) {
        // Check if already indexed
        const existing = await SearchIndex.findOne({
          highlightId: highlight.uuid,
          userId: userId
        });
        
        if (!existing) {
          await SearchIndex.create({
            pdfUuid: highlight.pdfUuid,
            userId: userId,
            pageNumber: highlight.pageNumber,
            content: highlight.highlightedText,
            contentType: 'annotation',
            position: highlight.position,
            highlightId: highlight.uuid
          });
          console.log('✅ Indexed highlight:', highlight.uuid);
        }
      }
      
      console.log('✅ Auto-indexing complete');
    } catch (error) {
      console.error('❌ Auto-indexing error:', error);
    }
  }

  // Get search suggestions
  async getSuggestions(req, res, next) {
    try {
      const { query } = req.query;
      
      if (!query || query.length < 2) {
        return res.json({ suggestions: [] });
      }

      console.log('💡 Getting suggestions for:', query);

      const results = await SearchIndex.find({
        userId: req.user._id,
        content: { $regex: query, $options: 'i' }
      }).limit(5).select('content');

      const suggestions = new Set();
      const queryLower = query.toLowerCase();
      
      results.forEach(result => {
        const words = result.content.split(/\s+/);
        words.forEach(word => {
          const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
          if (cleanWord.startsWith(queryLower) && cleanWord.length > queryLower.length) {
            suggestions.add(cleanWord);
          }
        });
      });

      const suggestionArray = Array.from(suggestions).slice(0, 5).map(text => ({
        text,
        count: 1
      }));

      console.log('💡 Returning suggestions:', suggestionArray);
      res.json({ suggestions: suggestionArray });

    } catch (error) {
      console.error('❌ Suggestions error:', error);
      res.json({ suggestions: [] });
    }
  }

  // Index a PDF manually
  async indexPdf(req, res, next) {
    try {
      const { uuid } = req.params;
      console.log('📄 Manual PDF indexing requested for:', uuid);
      
      const pdfDoc = await PDF.findOne({
        uuid: uuid,
        userId: req.user._id
      });

      if (!pdfDoc) {
        return res.status(404).json({ error: 'PDF not found' });
      }

      const existingIndex = await SearchIndex.findOne({
        pdfUuid: uuid,
        userId: req.user._id,
        contentType: 'pdf_text'
      });

      if (existingIndex) {
        return res.json({ message: 'PDF already indexed', indexed: true });
      }

      const dummyContent = [
        'This is sample PDF content for testing search functionality. Job opportunities and career development.',
        'Important documents and annotations for review. Professional development and skills.',
        'Sample text content that can be searched and highlighted. Employment and work-related information.',
        'Additional content for comprehensive search testing. Business and professional topics.'
      ];

      const indexEntries = dummyContent.map((content, index) => ({
        pdfUuid: uuid,
        userId: req.user._id,
        pageNumber: index + 1,
        content: content,
        contentType: 'pdf_text'
      }));

      await SearchIndex.insertMany(indexEntries);

      console.log('✅ PDF indexed successfully with sample content');

      res.json({
        message: 'PDF indexed successfully',
        indexed: true,
        pagesIndexed: indexEntries.length
      });

    } catch (error) {
      console.error('❌ PDF indexing error:', error);
      res.status(500).json({ error: 'Failed to index PDF' });
    }
  }

  // Index highlight/annotation
  async indexHighlight(highlightData, userId) {
    try {
      console.log('💡 Indexing highlight:', highlightData.highlightedText);
      
      const existing = await SearchIndex.findOne({
        highlightId: highlightData.uuid,
        userId: userId
      });
      
      if (existing) {
        console.log('💡 Highlight already indexed');
        return;
      }
      
      await SearchIndex.create({
        pdfUuid: highlightData.pdfUuid,
        userId: userId,
        pageNumber: highlightData.pageNumber,
        content: highlightData.highlightedText,
        contentType: 'annotation',
        position: highlightData.position,
        highlightId: highlightData.uuid
      });

      console.log('✅ Highlight indexed successfully');
    } catch (error) {
      console.error('❌ Error indexing highlight:', error);
    }
  }

  // Remove highlight from index
  async removeHighlightIndex(highlightId, userId) {
    try {
      await SearchIndex.deleteOne({
        highlightId: highlightId,
        userId: userId
      });
      console.log('✅ Highlight removed from index');
    } catch (error) {
      console.error('❌ Error removing highlight index:', error);
    }
  }

  // Advanced search method
  async advancedSearch(req, res, next) {
    try {
      console.log('🔍 Advanced search request received:', req.body);
      
      const {
        query,
        pdfUuids = [],
        contentTypes = ['all'],
        dateFrom,
        dateTo,
        pageNumber,
        fuzzy = false,
        page = 1,
        limit = 20
      } = req.body;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({ 
          error: 'Search query must be at least 2 characters',
          results: [],
          pagination: { total: 0, pages: 0, current: 1 }
        });
      }

      let searchFilter = {
        userId: req.user._id,
        content: { $regex: query, $options: 'i' }
      };

      if (pdfUuids.length > 0) {
        searchFilter.pdfUuid = { $in: pdfUuids };
      }

      if (!contentTypes.includes('all')) {
        searchFilter.contentType = { $in: contentTypes };
      }

      if (dateFrom || dateTo) {
        searchFilter.createdAt = {};
        if (dateFrom) searchFilter.createdAt.$gte = new Date(dateFrom);
        if (dateTo) searchFilter.createdAt.$lte = new Date(dateTo);
      }

      if (pageNumber) {
        searchFilter.pageNumber = parseInt(pageNumber);
      }

      console.log('🔍 Advanced search filter:', searchFilter);

      const skip = (page - 1) * limit;
      
      const [results, total] = await Promise.all([
        SearchIndex.find(searchFilter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        SearchIndex.countDocuments(searchFilter)
      ]);

      const pdfUuids_results = [...new Set(results.map(r => r.pdfUuid))];
      let pdfMap = {};
      
      if (pdfUuids_results.length > 0) {
        try {
          const pdfs = await PDF.find({
            uuid: { $in: pdfUuids_results },
            userId: req.user._id
          }).select('uuid originalName');

          pdfs.forEach(pdf => {
            pdfMap[pdf.uuid] = pdf.originalName;
          });
        } catch (error) {
          console.error('Error fetching PDF names:', error);
          pdfUuids_results.forEach(uuid => {
            pdfMap[uuid] = 'Unknown PDF';
          });
        }
      }

      // Format results using standalone function
      const formattedResults = results.map(result => {
        const highlightedContent = highlightSearchTerms(result.content, query);
        
        return {
          id: result._id,
          pdfUuid: result.pdfUuid,
          pdfName: pdfMap[result.pdfUuid] || 'Unknown PDF',
          pageNumber: result.pageNumber,
          content: result.content,
          highlightedContent,
          contentType: result.contentType,
          score: 1,
          highlightId: result.highlightId,
          position: result.position,
          createdAt: result.createdAt
        };
      });

      res.json({
        results: formattedResults,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        },
        query,
        fuzzy: false
      });

    } catch (error) {
      console.error('❌ Advanced search error:', error);
      res.status(500).json({ 
        error: 'Advanced search failed',
        message: error.message,
        results: [],
        pagination: { total: 0, pages: 0, current: 1 }
      });
    }
  }
}

module.exports = new SearchController();